import { useState, useEffect } from 'react'
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { GrChannel } from 'react-icons/gr'
import ListChannel from '../../components/Bulletin/ListChannel'
import ChannelName from '../../components/Bulletin/ChannelName'
import ChannelBulletin from '../../components/Bulletin/ChannelBulletin'

export default function TabChannel() {

  const dispatch = useDispatch()
  const navigate = useNavigate()

  const { ChannelList, CurrentChannel, CurrentChannelBulletinList } = useSelector(state => state.Messenger)
  const { Address, ContactMap } = useSelector(state => state.User)


  function scrollToBottom() {
    let MessageListContainer = document.getElementById('MessageListContainer')
    if (MessageListContainer !== null) {
      requestAnimationFrame(() => {
        MessageListContainer.scrollTop = MessageListContainer.scrollHeight
      })
    }
  }

  useEffect(() => {
    dispatch({ type: 'LoadChannelList' })
  }, [dispatch])

  useEffect(() => {
  }, [CurrentChannel])

  useEffect(() => {
    scrollToBottom()
  }, [CurrentChannelBulletinList])

  return (
    <div className="p-1 my-5 card h-full flex flex-row justify-start items-start">
      <div className='p-1 w-1/4 h-full flex flex-col justify-start'>
        <div className={`mt-1 flex flex-col`}>
          {
            ChannelList.length === 0 ?
              <div className="mx-auto rounded-full p-1 border-2 border-gray-200 dark:border-gray-700 px-4">
                <h3 className='text-2xl text-gray-500 dark:text-gray-200'>
                  no channel yet...
                </h3>
              </div>
              :
              ChannelList.map((channel, index) => (
                <div key={index} className='text-xs text-gray-200 mt-1 p-1'>
                  <ListChannel channel={channel} />
                </div>
              ))
          }
        </div>
      </div>

      <div className='p-1 w-3/4 h-full flex flex-col'>
        {
          CurrentChannel &&
          <div className='h-full' >
            <div className='flex flex-col h-full' >
              <div className="card-title row-center-middle" title={CurrentChannel.name}>
                <GrChannel className="channel-icon" /><ChannelName name={CurrentChannel.name} />
              </div>

              <div id='MessageListContainer' className="min-h-[50vh] max-h-[75vh] flex-grow overflow-y-auto" >
                {
                  CurrentChannelBulletinList.length > 0 ?
                    CurrentChannelBulletinList.map((bulletin, index) => (
                      <div key={bulletin.Hash} className='mt-1 px-1'>
                        <ChannelBulletin bulletin={bulletin} />
                      </div>
                    ))
                    :
                    <div>
                      no bulletin yet...
                    </div>
                }
              </div>
            </div>
          </div>
        }
      </div>
    </div >
  )
}