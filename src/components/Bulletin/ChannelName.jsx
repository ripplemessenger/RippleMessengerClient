const ChannelName = ({ name, style }) => {
  return (
    <div>
      <span className={`session-name ${style}`} title={name}>
        {name}
      </span>
    </div>
  )
}

export default ChannelName